import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform comment creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformComment.ICreate with a randomized
 * comment text. The optional commentId enables creating threaded replies
 * by linking to a parent comment.
 *
 * @param input Partial overwrite object for customizing specific fields
 * @returns A randomized ICommunityPlatformComment.ICreate
 */
export function prepare_random_community_platform_comment(
  input?: DeepPartial<ICommunityPlatformComment.ICreate> | undefined,
): ICommunityPlatformComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
    commentId: input?.commentId ?? undefined,
  };
}
