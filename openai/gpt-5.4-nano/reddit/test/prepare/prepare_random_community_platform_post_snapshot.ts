import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_snapshot(
  input?: DeepPartial<ICommunityPlatformPostSnapshot.ICreate> | undefined,
): ICommunityPlatformPostSnapshot.ICreate {
  return {
    publishedAt:
      input?.publishedAt ?? typia.random<string & tags.Format<"date-time">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 2,
        sentenceMax: 5,
      }),
    linkUrl:
      input?.linkUrl ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uri">>()),
  };
}
