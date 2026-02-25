import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_review_moderation_action } from "../prepare/prepare_random_ecommerce_review_moderation_action";

export async function generate_random_ecommerce_administrator_review_moderation_actions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceReviewModerationAction.ICreate> | undefined;
  },
): Promise<IEcommerceReviewModerationAction> {
  const prepared: IEcommerceReviewModerationAction.ICreate =
    prepare_random_ecommerce_review_moderation_action(props.body);
  const result: IEcommerceReviewModerationAction =
    await api.functional.ecommerce.administrator.review_moderation_actions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
