import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member profile retrieval
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for the member to retrieve (since no creation API available)
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the profile retrieval endpoint
  const profile = await api.functional.redditPlatform.members.at(
    memberConnection,
    {
      memberId,
    },
  );
  // Validate response structure
  typia.assert(profile);
  // Verify public profile fields are present
  TestValidator.equals("member id is UUID", profile.id, memberId);
  TestValidator.predicate(
    "username is string",
    typeof profile.username === "string",
  );
  TestValidator.predicate(
    "display_name is string",
    typeof profile.display_name === "string",
  );
  TestValidator.predicate(
    "karma_score is integer",
    Number.isInteger(profile.karma_score),
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof profile.is_active === "boolean",
  );
  TestValidator.predicate(
    "created_at is date-time",
    profile.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is date-time",
    profile.updated_at.includes("T"),
  );
  TestValidator.equals(
    "deleted_at is null for active member",
    profile.deleted_at,
    null,
  );
  // Verify optional fields can be null
  TestValidator.predicate(
    "bio can be null",
    profile.bio === null || typeof profile.bio === "string",
  );
  TestValidator.predicate(
    "avatar_url can be null",
    profile.avatar_url === null || profile.avatar_url === undefined,
  );
  // Verify nested relations are arrays
  TestValidator.predicate("sessions is array", Array.isArray(profile.sessions));
  TestValidator.predicate("posts is array", Array.isArray(profile.posts));
  TestValidator.predicate("comments is array", Array.isArray(profile.comments));
  TestValidator.predicate(
    "postVotes is array",
    Array.isArray(profile.postVotes),
  );
  TestValidator.predicate(
    "commentVotes is array",
    Array.isArray(profile.commentVotes),
  );
  TestValidator.predicate("reports is array", Array.isArray(profile.reports));
  // Verify sensitive fields are NOT included (email and password_hash should not exist)
  TestValidator.predicate(
    "email field is not present",
    "email" in profile === false,
  );
  TestValidator.predicate(
    "password_hash field is not present",
    "password_hash" in profile === false,
  );
  // Verify nested relation structures
  for (const session of profile.sessions) {
    typia.assert(session);
  }
  for (const post of profile.posts) {
    typia.assert(post);
  }
  for (const comment of profile.comments) {
    typia.assert(comment);
  }
  for (const postVote of profile.postVotes) {
    typia.assert(postVote);
  }
  for (const commentVote of profile.commentVotes) {
    typia.assert(commentVote);
  }
  for (const report of profile.reports) {
    typia.assert(report);
  }
}
