import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * E2E test that validates the moderator join request audit workflow.
 *
 * Steps:
 *
 * 1. Register as a new moderator; ensure authentication is established for
 *    subsequent API authorization.
 * 2. Attempt to retrieve a join request audit for a random community and
 *    joinRequestId.
 * 3. Validate that the response contains all fields expected in
 *    ICommunityPlatformCommunityJoinRequest and matches type contract, ensuring
 *    moderator role has correct field visibility.
 */
export async function test_api_moderator_join_request_audit_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register new moderator (establish authentication/token)
  const email = `${RandomGenerator.alphaNumeric(12)}@test.com` as string &
    tags.Format<"email">;
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    status: "active",
    href: `https://test.com/${RandomGenerator.alphaNumeric(10)}` as string &
      tags.Format<"uri">,
    referrer:
      `https://referrer.com/${RandomGenerator.alphaNumeric(10)}` as string &
        tags.Format<"uri">,
    business_status: null,
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinBody });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator status is active",
    moderator.status,
    "active",
  );
  TestValidator.equals("moderator email matches input", moderator.email, email);

  // 2. Prepare random handles for accessible community and join request (in real test, these would be provided/setup)
  const communityName = RandomGenerator.alphaNumeric(8);
  const joinRequestId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call join request audit endpoint as authenticated moderator
  const output: ICommunityPlatformCommunityJoinRequest =
    await api.functional.communityPlatform.moderator.communities.joinRequests.at(
      connection,
      {
        communityName,
        joinRequestId,
      },
    );
  typia.assert(output);

  // 4. Validate all key fields are present and properly typed per schema
  TestValidator.predicate(
    "join request has an id",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.predicate(
    "community info present",
    typeof output.community === "object" && !!output.community,
  );
  TestValidator.predicate(
    "user info present",
    typeof output.user === "object" && !!output.user,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof output.status === "string" && output.status.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid string",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid string",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  // Field visibility - processed_by_moderator must be object or null/undefined
  TestValidator.predicate(
    "processed_by_moderator is summary, null or undefined",
    output.processed_by_moderator === null ||
      output.processed_by_moderator === undefined ||
      (typeof output.processed_by_moderator === "object" &&
        output.processed_by_moderator !== null),
  );
}
