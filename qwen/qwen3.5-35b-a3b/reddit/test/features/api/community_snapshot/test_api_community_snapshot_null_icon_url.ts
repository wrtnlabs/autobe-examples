import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_snapshots_create } from "../../../generate/generate_random_reddit_platform_member_communities_snapshots_create";
import { prepare_random_reddit_platform_community_snapshot } from "../../../prepare/prepare_random_reddit_platform_community_snapshot";

export async function test_api_community_snapshot_null_icon_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create community snapshot with null icon_url
  // Note: We create a snapshot with explicit undefined icon_url to test null preservation
  // The snapshot operation should preserve null values from the community state
  const snapshot =
    await api.functional.redditPlatform.member.communities.snapshots.create(
      memberConnection,
      {
        name: RandomGenerator.name(),
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          // icon_url is intentionally not set to test null preservation
        } satisfies IRedditPlatformCommunitySnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure
  TestValidator.equals("snapshot id is present", snapshot.id.length > 0, true);
  TestValidator.equals(
    "snapshot community_id is present",
    snapshot.community_id.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot name is present",
    snapshot.name.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot description is string",
    typeof snapshot.description === "string",
    true,
  );
  TestValidator.equals("icon_url is null", snapshot.icon_url === null, true);
  TestValidator.equals(
    "created_at is valid datetime",
    snapshot.created_at !== undefined,
    true,
  );
  // 4. Validate null vs empty string distinction
  TestValidator.notEquals(
    "description not empty string",
    snapshot.description,
    "",
    (key) => key !== "description",
  );
}
