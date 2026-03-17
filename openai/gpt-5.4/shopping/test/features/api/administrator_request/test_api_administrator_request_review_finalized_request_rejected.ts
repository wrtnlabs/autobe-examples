import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_review_finalized_request_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const requestReason = RandomGenerator.paragraph({ sentences: 6 });
  const createdRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(createdRequest);
  TestValidator.equals(
    "created request starts pending",
    createdRequest.status,
    "pending",
  );
  TestValidator.equals(
    "created request preserves reason",
    createdRequest.reason,
    requestReason,
  );
  TestValidator.equals(
    "created request has no review note",
    createdRequest.review_note,
    null,
  );
  TestValidator.equals(
    "created request has no rejection reason",
    createdRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "created request is not yet reviewed",
    createdRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "created request is not yet approved",
    createdRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "created request is not yet rejected",
    createdRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "created request has no reviewer yet",
    createdRequest.reviewedByAdministrator,
    null,
  );
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministrator);
  const firstReviewBody = {
    status: "rejected",
    reviewNote: RandomGenerator.paragraph({ sentences: 3 }),
    rejectionReason: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdministratorRequest.IUpdate;
  const finalizedRequest =
    await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
      superAdministratorConnection,
      {
        administratorRequestId: createdRequest.id,
        body: firstReviewBody,
      },
    );
  typia.assert(finalizedRequest);
  TestValidator.equals(
    "finalized request keeps same id",
    finalizedRequest.id,
    createdRequest.id,
  );
  TestValidator.equals(
    "finalized request becomes rejected",
    finalizedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "finalized request preserves original reason",
    finalizedRequest.reason,
    createdRequest.reason,
  );
  TestValidator.equals(
    "finalized request stores review note",
    finalizedRequest.review_note,
    firstReviewBody.reviewNote ?? null,
  );
  TestValidator.equals(
    "finalized request stores rejection reason",
    finalizedRequest.rejection_reason,
    firstReviewBody.rejectionReason ?? null,
  );
  TestValidator.equals(
    "finalized request remains unapproved",
    finalizedRequest.approved_at,
    null,
  );
  TestValidator.predicate(
    "finalized request has reviewed timestamp",
    finalizedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "finalized request has rejected timestamp",
    finalizedRequest.rejected_at !== null,
  );
  const reviewedByAdministrator = typia.assert<
    NonNullable<typeof finalizedRequest.reviewedByAdministrator>
  >(finalizedRequest.reviewedByAdministrator);
  const finalizedStatus = finalizedRequest.status;
  const finalizedReviewNote = finalizedRequest.review_note;
  const finalizedRejectionReason = finalizedRequest.rejection_reason;
  const finalizedReviewedAt = finalizedRequest.reviewed_at;
  const finalizedRejectedAt = finalizedRequest.rejected_at;
  const finalizedApprovedAt = finalizedRequest.approved_at;
  const finalizedReviewerId = reviewedByAdministrator.id;
  const secondReviewBody = {
    status: "approved",
    reviewNote: RandomGenerator.paragraph({ sentences: 2 }),
    rejectionReason: null,
  } satisfies IShoppingMallAdministratorRequest.IUpdate;
  await TestValidator.error(
    "cannot re-review a finalized administrator request with a different decision",
    async () => {
      await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
        superAdministratorConnection,
        {
          administratorRequestId: createdRequest.id,
          body: secondReviewBody,
        },
      );
    },
  );
  await TestValidator.error(
    "finalized administrator request remains non-reviewable after failed re-review",
    async () => {
      await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
        superAdministratorConnection,
        {
          administratorRequestId: createdRequest.id,
          body: firstReviewBody,
        },
      );
    },
  );
  TestValidator.equals(
    "finalized snapshot status remains rejected",
    finalizedStatus,
    "rejected",
  );
  TestValidator.equals(
    "finalized snapshot review note remains unchanged",
    finalizedReviewNote,
    firstReviewBody.reviewNote ?? null,
  );
  TestValidator.equals(
    "finalized snapshot rejection reason remains unchanged",
    finalizedRejectionReason,
    firstReviewBody.rejectionReason ?? null,
  );
  TestValidator.equals(
    "finalized snapshot approved timestamp remains null",
    finalizedApprovedAt,
    null,
  );
  TestValidator.equals(
    "finalized snapshot reviewed timestamp remains the original one",
    finalizedReviewedAt,
    finalizedRequest.reviewed_at,
  );
  TestValidator.equals(
    "finalized snapshot rejected timestamp remains the original one",
    finalizedRejectedAt,
    finalizedRequest.rejected_at,
  );
  TestValidator.equals(
    "finalized snapshot reviewer remains the original reviewer",
    finalizedReviewerId,
    reviewedByAdministrator.id,
  );
}
