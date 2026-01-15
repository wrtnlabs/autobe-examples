import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: IShoppingMallSeller.IJoin;
  },
): Promise<IShoppingMallSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    business_name: props.body?.business_name ?? RandomGenerator.name(),
    contact_phone: props.body?.contact_phone ?? RandomGenerator.mobile(),
    createdAt: props.body?.createdAt ?? new Date().toISOString(),
  } satisfies IShoppingMallSeller.IJoin;
  return await api.functional.auth.seller.join(connection, { body: joinInput });
}
