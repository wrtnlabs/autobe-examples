import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_sort_order } from "../prepare/prepare_random_community_platform_comment_sort_order";

export async function generate_random_community_platform_comment_sort_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentSortOrder.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommentSortOrder> {
  const prepared: ICommunityPlatformCommentSortOrder.ICreate =
    prepare_random_community_platform_comment_sort_order(props.body);
  const result: ICommunityPlatformCommentSortOrder =
    await api.functional.communityPlatform.commentSortOrders.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
