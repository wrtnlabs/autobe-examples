import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_snapshot(
  input?: DeepPartial<ICommunityPlatformPostSnapshot.ICreate>,
): ICommunityPlatformPostSnapshot.ICreate {
  return {
    communityPlatformPostId:
      input?.communityPlatformPostId ??
      typia.random<string & tags.Format<"uuid">>(),
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: RandomGenerator.pick([2, 3, 4, 5]),
      }),
    contentText:
      input?.contentText !== undefined
        ? input.contentText
        : Math.random() < 0.7
          ? null
          : RandomGenerator.paragraph({ sentences: 3 }),
    contentUrl:
      input?.contentUrl !== undefined
        ? input.contentUrl
        : Math.random() < 0.7
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    contentImageUrl:
      input?.contentImageUrl !== undefined
        ? input.contentImageUrl
        : Math.random() < 0.8
          ? null
          : `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
    postType:
      input?.postType ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    authorUserId:
      input?.authorUserId ?? typia.random<string & tags.Format<"uuid">>(),
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    voteScore:
      input?.voteScore ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-1000> & tags.Maximum<1000>
      >(),
    commentCount:
      input?.commentCount ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
      >(),
  };
}
