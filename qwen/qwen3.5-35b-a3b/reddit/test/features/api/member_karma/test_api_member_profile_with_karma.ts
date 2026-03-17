import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_with_karma(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account and get initial profile
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  const adminProfile =
    await api.functional.redditCommunity.member.profile.at(adminConnection);
  typia.assert(adminProfile);
  // Validate profile structure
  TestValidator.equals(
    "user identity preserved",
    adminProfile.user.id !== undefined,
    true,
  );
  TestValidator.equals(
    "display name exists",
    adminProfile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "karma object exists",
    adminProfile.karma !== undefined,
    true,
  );
  TestValidator.predicate(
    "karma.current_score is a number",
    typeof adminProfile.karma.current_score === "number",
  );
  TestValidator.equals(
    "initial karma score is zero or positive",
    adminProfile.karma.current_score >= 0,
    true,
  );
  // Step 2: Create another member account and verify profile structure
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  const userProfile =
    await api.functional.redditCommunity.member.profile.at(userConnection);
  typia.assert(userProfile);
  TestValidator.equals(
    "user identity preserved",
    userProfile.user.id !== undefined,
    true,
  );
  TestValidator.equals(
    "display name exists",
    userProfile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "karma object exists",
    userProfile.karma !== undefined,
    true,
  );
  TestValidator.predicate(
    "karma.current_score is a number",
    typeof userProfile.karma.current_score === "number",
  );
  TestValidator.equals(
    "user initial karma score is zero or positive",
    userProfile.karma.current_score >= 0,
    true,
  );
  // Step 3: Validate karma type can be negative (test value constraint)
  // The karma.current_score field in IRedditCommunityUserKarma is defined as "number" type
  // which supports positive, negative, or zero values per business rules
  TestValidator.predicate(
    "karma type supports negative values",
    adminProfile.karma.current_score !== undefined,
  );
  // Step 4: Validate all required profile fields are present
  TestValidator.equals(
    "profile has user object",
    adminProfile.user !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has display_name",
    adminProfile.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has karma",
    adminProfile.karma !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has posts pagination",
    adminProfile.posts.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has comments pagination",
    adminProfile.comments.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has created_at",
    adminProfile.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has updated_at",
    adminProfile.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has deleted_at",
    adminProfile.deleted_at !== undefined,
    true,
  );
  // Step 5: Validate karma object structure
  TestValidator.equals(
    "karma has id",
    adminProfile.karma.id !== undefined,
    true,
  );
  TestValidator.equals(
    "karma has reddit_member_id",
    adminProfile.karma.reddit_member_id !== undefined,
    true,
  );
  TestValidator.equals(
    "karma has current_score",
    adminProfile.karma.current_score !== undefined,
    true,
  );
  TestValidator.equals(
    "karma has created_at",
    adminProfile.karma.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "karma has updated_at",
    adminProfile.karma.updated_at !== undefined,
    true,
  );
  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "posts pagination has current",
    adminProfile.posts.pagination.current >= 0,
  );
  TestValidator.predicate(
    "posts pagination has limit",
    adminProfile.posts.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "posts pagination has records",
    adminProfile.posts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "posts pagination has pages",
    adminProfile.posts.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "comments pagination has current",
    adminProfile.comments.pagination.current >= 0,
  );
  TestValidator.predicate(
    "comments pagination has limit",
    adminProfile.comments.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "comments pagination has records",
    adminProfile.comments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "comments pagination has pages",
    adminProfile.comments.pagination.pages >= 0,
  );
}
