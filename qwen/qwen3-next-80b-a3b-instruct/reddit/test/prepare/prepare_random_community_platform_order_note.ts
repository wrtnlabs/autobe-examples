import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderNote";
export function prepare_random_community_platform_order_note(
  input?: DeepPartial<ICommunityPlatformOrderNote.ICreate> | undefined,
): ICommunityPlatformOrderNote.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 8,
      }),
    order_id: input?.order_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
