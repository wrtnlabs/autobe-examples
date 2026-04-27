import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_list_deleted_user_anonymity(
  connection: api.IConnection,
): Promise<void> {
  // Join as a customer to get an authenticated connection for the reviews endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Fetch reviews with pagination
  const reviewsPage = await api.functional.eCommerceMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        direction: "desc",
      } satisfies IECommerceMallReview.IRequest,
    },
  );
  typia.assert(reviewsPage);
  // For each review, verify the customer display name anonymity rule:
  // - If customer.deleted_at is non-null → display_name should be "deleted user"
  // - If customer.deleted_at is null → display_name should be the actual name (not "deleted user")
  for (const review of reviewsPage.data) {
    if (review.customer.deleted_at !== null) {
      TestValidator.equals(
        "deleted customer review shows anonymized display name",
        review.customer.profile?.display_name,
        "deleted user",
      );
    } else {
      // Active customer should NOT show "deleted user"
      TestValidator.notEquals(
        "active customer review does not show 'deleted user'",
        review.customer.profile?.display_name,
        "deleted user",
      );
    }
  }
}
