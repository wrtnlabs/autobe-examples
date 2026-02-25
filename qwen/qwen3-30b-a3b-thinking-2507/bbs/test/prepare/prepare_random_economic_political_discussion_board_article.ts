import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_discussion_board_article(
  input?: DeepPartial<IEconomicPoliticalDiscussionBoardArticle.ICreate>,
): IEconomicPoliticalDiscussionBoardArticle.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content: input?.content ?? RandomGenerator.content({ paragraphs: 2 }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
    attachments: input?.attachments
      ? input.attachments.map((attachment) => ({
          url: attachment.url ?? typia.random<string & tags.Format<"url">>(),
          type:
            attachment.type ?? RandomGenerator.pick(["file", "image"] as const),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            url: typia.random<string & tags.Format<"url">>(),
            type: RandomGenerator.pick(["file", "image"] as const),
          }),
        ),
  };
}
