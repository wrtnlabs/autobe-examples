import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report(
  input?: DeepPartial<ICommunityPlatformReport.ICreate>,
): ICommunityPlatformReport.ICreate {
  const hasPostId = input?.postId !== undefined;
  const hasCommentId = input?.commentId !== undefined;
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 10, wordMin: 5, wordMax: 10 }),
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    postId: hasCommentId
      ? undefined
      : (input?.postId ?? typia.random<string & tags.Format<"uuid">>()),
    commentId: hasPostId ? undefined : input?.commentId,
  };
}
