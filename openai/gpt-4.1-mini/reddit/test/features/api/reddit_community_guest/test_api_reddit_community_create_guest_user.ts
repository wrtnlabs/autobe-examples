import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_create_guest_user(
  connection: api.IConnection,
) {
  // Generate guest create request body with realistic values
  const nowIsoString = new Date().toISOString();
  const ipAddress = typia.random<string & tags.Format<"ipv4">>();
  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RandomGenerator.pick(
    ["90", "91", "92", "93", "94", "95"] as const,
  )}.0.${typia.random<number & tags.Type<"uint32">>()} Safari/537.36`;
  const referrerUrl = "https://www.example.com/landing-page";
  const deviceType = RandomGenerator.pick([
    "desktop",
    "mobile",
    "tablet",
  ] as const);

  const createBody = {
    ip_address: ipAddress,
    user_agent: userAgent,
    referrer_url: referrerUrl,
    device_type: deviceType,
    session_start_time: nowIsoString,
  } satisfies IRedditCommunityGuest.ICreate;

  // Call the API to create guest user
  const output: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunity.guests.create(
      connection,
      {
        body: createBody,
      },
    );

  // Validate the response type
  typia.assert(output);

  // Verify required properties in the output
  TestValidator.predicate(
    "guest has valid UUID id",
    typeof output.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        output.id,
      ),
  );
  TestValidator.predicate(
    "guest session_id present",
    typeof output.session_id === "string" && output.session_id.length > 0,
  );
  TestValidator.equals(
    "guest ip_address matches",
    output.ip_address,
    ipAddress,
  );
  if (output.user_agent !== undefined && output.user_agent !== null) {
    TestValidator.equals(
      "guest user_agent matches",
      output.user_agent,
      userAgent,
    );
  }
  if (output.device_type !== undefined && output.device_type !== null) {
    TestValidator.equals(
      "guest device_type matches",
      output.device_type,
      deviceType,
    );
  }
  TestValidator.predicate(
    "guest created_at is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/i.test(output.created_at),
  );
}
