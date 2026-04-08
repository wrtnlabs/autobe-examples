import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_order_item_cancellation_request_prevent_duplicate_active_request(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234" satisfies string & tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
      administratorConnection,
      {
        params: { orderItemId },
        body: {
          reason: firstReason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  const preservedReason = firstRequest.reason;
  const preservedStatus = firstRequest.status;
  const preservedReviewedAt = firstRequest.reviewedAt;
  const preservedReviewResult = firstRequest.reviewResult;
  const preservedReviewerNote = firstRequest.reviewerNote;
  const preservedCreatedAt = firstRequest.createdAt;
  const preservedUpdatedAt = firstRequest.updatedAt;
  const preservedDeletedAt = firstRequest.deletedAt;
  await TestValidator.error(
    "duplicate active cancellation request should be rejected",
    async () => {
      await generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
        administratorConnection,
        {
          params: { orderItemId },
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original cancellation reason is preserved",
    firstRequest.reason,
    preservedReason,
  );
  TestValidator.equals(
    "original cancellation status is preserved",
    firstRequest.status,
    preservedStatus,
  );
  TestValidator.equals(
    "original reviewedAt is preserved",
    firstRequest.reviewedAt,
    preservedReviewedAt,
  );
  TestValidator.equals(
    "original reviewResult is preserved",
    firstRequest.reviewResult,
    preservedReviewResult,
  );
  TestValidator.equals(
    "original reviewerNote is preserved",
    firstRequest.reviewerNote,
    preservedReviewerNote,
  );
  TestValidator.equals(
    "original createdAt is preserved",
    firstRequest.createdAt,
    preservedCreatedAt,
  );
  TestValidator.equals(
    "original updatedAt is preserved",
    firstRequest.updatedAt,
    preservedUpdatedAt,
  );
  TestValidator.equals(
    "original deletedAt is preserved",
    firstRequest.deletedAt,
    preservedDeletedAt,
  );
}
