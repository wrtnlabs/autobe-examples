import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin_email_verification } from "../prepare/prepare_random_shopping_mall_admin_email_verification";

export async function generate_random_shopping_mall_admin_email_verifications_resend_verification(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdminEmailVerification.ICreate> | undefined;
  },
): Promise<IShoppingMallAdminEmailVerification.IResponse> {
  const prepared: IShoppingMallAdminEmailVerification.ICreate =
    prepare_random_shopping_mall_admin_email_verification(props.body);
  return await api.functional.shoppingMall.admin.email_verifications.resendVerification(
    connection,
    {
      body: prepared,
    },
  );
}
