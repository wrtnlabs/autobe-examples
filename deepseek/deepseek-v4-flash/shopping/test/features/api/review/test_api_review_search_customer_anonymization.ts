import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_review_search_customer_anonymization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {});
  // 2. Search all reviews
  const reviewsPage: IPageIECommerceMallReview.ISummary =
    await api.functional.eCommerceMall.superAdministrator.reviews.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewsPage);
  // 3. Validate anonymization for deleted customer accounts
  for (const review of reviewsPage.data) {
    // typia.assert already validates the full review structure
    // Focus on business logic: customer anonymization rules
    if (review.customer.deleted_at !== null) {
      // Customer account was deleted — display name must be anonymized
      TestValidator.predicate(
        "deleted customer profile is anonymized",
        () =>
          review.customer.profile === null ||
          (review.customer.profile !== null &&
            review.customer.profile.display_name === "deleted user"),
      );
    } else {
      // Customer account is active — display name must NOT be anonymized
      if (review.customer.profile !== null) {
        TestValidator.predicate(
          "active customer display name is not deleted user",
          () => review.customer.profile!.display_name !== "deleted user",
        );
      }
    }
  }
}
