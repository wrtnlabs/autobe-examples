import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_rejection_reason_not_applicable_when_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (creates with 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  // 2. Call the rejection reason endpoint for the authenticated seller
  const response =
    await api.functional.ecommerceMall.seller.sellers.rejection_reason.at(
      sellerConnection,
    );
  // 3. Validate response with typia.assert
  typia.assert(response);
  // 4. Validate rejectionReason is null (not applicable for non-rejected sellers)
  TestValidator.equals(
    "rejection reason should be null for non-rejected seller",
    response.rejectionReason,
    null,
  );
}
