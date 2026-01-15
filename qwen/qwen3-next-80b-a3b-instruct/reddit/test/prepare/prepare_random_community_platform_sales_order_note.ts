import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
export function prepare_random_community_platform_sales_order_note(
  input?: DeepPartial<ICommunityPlatformSalesOrderNote.ICreate>,
): ICommunityPlatformSalesOrderNote.ICreate {
  return {
    order_id: input?.order_id ?? typia.random<string & tags.Format<"uuid">>(),
    content:
      input?.content ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 10,
      }),
  };
}
