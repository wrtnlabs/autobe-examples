import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_content_report(
  input?: DeepPartial<ICommunityPlatformContentReport.ICreate> | undefined,
): ICommunityPlatformContentReport.ICreate {
  // Helper to check if a value is defined and not null
  const isDefined = <T,>(value: T | null | undefined): value is T =>
    value !== undefined && value !== null;
  // Check input for provided content IDs
  const inputPostId = input?.postId;
  const inputCommentId = input?.commentId;
  const hasPostId = isDefined(inputPostId);
  const hasCommentId = isDefined(inputCommentId);
  // Determine which content ID to use based on input and business rules
  // Business rule: exactly one of postId or commentId should be provided
  let usePostId: boolean;
  if (hasPostId && hasCommentId) {
    // Both provided - invalid per business rules, default to postId
    usePostId = true;
  } else if (hasPostId) {
    // Only postId provided
    usePostId = true;
  } else if (hasCommentId) {
    // Only commentId provided
    usePostId = false;
  } else {
    // Neither provided - randomly choose one
    usePostId = Math.random() < 0.5;
  }
  // Generate reason text
  const reason = input?.reason ?? RandomGenerator.paragraph({ sentences: 2 });
  // Generate content IDs based on decision
  if (usePostId) {
    return {
      reason,
      postId: hasPostId
        ? inputPostId!
        : typia.random<string & tags.Format<"uuid">>(),
      commentId: undefined,
    };
  } else {
    return {
      reason,
      postId: undefined,
      commentId: hasCommentId
        ? inputCommentId!
        : typia.random<string & tags.Format<"uuid">>(),
    };
  }
}
