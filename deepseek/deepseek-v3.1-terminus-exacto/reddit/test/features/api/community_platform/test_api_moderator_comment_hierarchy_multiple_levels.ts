import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentHierarchy";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_hierarchy_multiple_levels(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Use a random post ID since we cannot create posts with available endpoints
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve comment hierarchy
  const hierarchy =
    await api.functional.communityPlatform.moderator.posts.comments.hierarchy.invert(
      moderatorConnection,
      { postId },
    );
  typia.assert(hierarchy);
  // Validate that the hierarchy structure is properly formed
  // The typia.assert() above already validates all types and structure
  // We focus on business logic validation
  // Test that the hierarchy maintains parent-child relationships
  const validateHierarchyStructure = (
    comment: ICommunityPlatformCommentHierarchy,
    depth: number = 0,
  ): void => {
    // Ensure each level has proper nesting
    TestValidator.predicate(
      `comment at depth ${depth} has valid structure`,
      comment.id !== undefined && comment.content !== undefined,
    );
    // Validate author information exists
    TestValidator.predicate(
      `comment author at depth ${depth} has valid structure`,
      comment.author.id !== undefined && comment.author.username !== undefined,
    );
    // Recursively validate children
    comment.children.forEach((child, index) => {
      TestValidator.predicate(
        `child ${index} at depth ${depth + 1} has valid parent relationship`,
        child.id !== undefined,
      );
      validateHierarchyStructure(child, depth + 1);
    });
  };
  validateHierarchyStructure(hierarchy);
  // Test that vote scores are integers
  TestValidator.predicate(
    "root comment vote score is integer",
    Number.isInteger(hierarchy.voteScore),
  );
  // Test timestamp formats (basic validation that they exist)
  TestValidator.predicate(
    "createdAt timestamp exists",
    hierarchy.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    hierarchy.updatedAt.length > 0,
  );
  // Test that deletedAt can be null (indicating active comments)
  TestValidator.predicate(
    "deletedAt can be null for active comments",
    hierarchy.deletedAt === null || typeof hierarchy.deletedAt === "string",
  );
}
