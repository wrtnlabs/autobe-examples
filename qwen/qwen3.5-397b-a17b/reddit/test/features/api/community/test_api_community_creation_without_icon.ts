import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community creation without providing an icon image.
 *
 * This test verifies that a community can be successfully created
 * without specifying the optional iconImageUri field. The test:
 * 1. Authenticates a new member
 * 2. Creates a community with only name and description (no icon)
 * 3. Verifies the community is created successfully
 * 4. Validates that communityIcons array is empty
 * 5. Confirms all other attributes are correctly set
 */
export async function test_api_community_creation_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member who will create the community
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create community WITHOUT iconImageUri (only required fields)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          // Explicitly omit iconImageUri to test creation without icon
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          }),
        },
      },
    );
  typia.assert(community);
  // 3. Validate community was created successfully
  TestValidator.predicate("community has valid id", community.id !== undefined);
  TestValidator.predicate(
    "community has valid name",
    community.name.length > 0,
  );
  TestValidator.predicate(
    "community has valid description",
    community.description.length > 0,
  );
  // 4. Verify communityIcons array is empty (no icon was provided)
  TestValidator.predicate(
    "communityIcons array is empty",
    community.communityIcons.length === 0,
  );
  // 5. Validate owner relationship
  TestValidator.equals("owner id matches creator", community.owner.id, auth.id);
  TestValidator.predicate(
    "owner has username",
    community.owner.username.length > 0,
  );
  // 6. Validate subscriber count (should be 0 for new community)
  TestValidator.equals(
    "subscriber count is zero",
    community.subscriber_count,
    0,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    community.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    community.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active community",
    community.deleted_at,
    null,
  );
}
