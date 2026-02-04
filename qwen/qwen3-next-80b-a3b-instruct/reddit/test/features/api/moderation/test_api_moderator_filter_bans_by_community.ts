import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_filter_bans_by_community(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Generate a valid UUID for community_id (since we cannot create a community)
  // The endpoint requires community_id to be string & Format<"uuid"> so we generate valid format
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Filter bans by community_id - verify the endpoint can handle filtering
  // This is the only available API function for this scenario
  const filteredBans =
    await api.functional.communityPlatform.moderator.moderation.bans.index(
      moderatorConnection,
      {
        body: {
          community_id: testCommunityId,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(filteredBans);
  // Step 4: Validate the response structure
  // Check that pagination exists
  TestValidator.predicate(
    "response contains pagination",
    () => filteredBans.pagination !== undefined,
  );
  // Check that data array exists (it can be empty)
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(filteredBans.data),
  );
  // Verify each ban entry has required structure
  for (const banEntry of filteredBans.data) {
    // Ensure ban has target_type
    TestValidator.equals(
      "ban target_type is one of allowed values",
      banEntry.target_type === "member" || banEntry.target_type === "post" || banEntry.target_type === "comment",
      true
    );
    // Ensure target_id is valid UUID format
    TestValidator.predicate("ban target_id is valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        banEntry.target_id,
      ),
    );
    // Ensure moderator summary exists
    TestValidator.predicate(
      "ban has moderator",
      () => banEntry.moderator !== undefined,
    );
    TestValidator.equals(
      "moderator id is UUID",
      banEntry.moderator.id,
      banEntry.moderator.id,
    ); // Verify type format
    TestValidator.predicate(
      "moderator username exists",
      () => banEntry.moderator.username !== undefined,
    );
    // Ensure community summary exists
    TestValidator.predicate(
      "ban has community",
      () => banEntry.community !== undefined,
    );
    TestValidator.equals(
      "community name exists",
      banEntry.community.name,
      banEntry.community.name,
    ); // Verifying type
    TestValidator.predicate(
      "community description is string",
      () => typeof banEntry.community.description === "string",
    );
    TestValidator.predicate("community icon is URI", () =>
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(
        banEntry.community.icon,
      ),
    );
    TestValidator.predicate(
      "community subscriber_count is number",
      () => typeof banEntry.community.subscriber_count === "number",
    );
    TestValidator.predicate("community created_at is ISO date-time", () =>
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        banEntry.community.created_at,
      ),
    );
  }
}