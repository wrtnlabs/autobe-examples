import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_snapshot_earlier_history_preserved(
  connection: api.IConnection,
): Promise<void> {
  const fixtureSource = globalThis as typeof globalThis & {
    __E2E_FIXTURE_CANCELLATION_SNAPSHOT_HISTORY__?: {
      customer: IShoppingMallCustomer.IJoin;
      cancellationRequestId: string & tags.Format<"uuid">;
      earlierSnapshotId: string & tags.Format<"uuid">;
      laterSnapshotId: string & tags.Format<"uuid">;
      expectedEarlierReviewerDisplayName: string | null;
      expectedEarlierCreatedAt: string & tags.Format<"date-time">;
    };
  };
  const fixture = fixtureSource.__E2E_FIXTURE_CANCELLATION_SNAPSHOT_HISTORY__;
  TestValidator.predicate(
    "cancellation snapshot history fixture exists",
    fixture !== undefined,
  );
  typia.assert(fixture!);
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: fixture!.customer.email,
      password: fixture!.customer.password,
      href: fixture!.customer.href,
      referrer: fixture!.customer.referrer,
      ip: fixture!.customer.ip,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const earlierSnapshot =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: fixture!.cancellationRequestId,
        snapshotId: fixture!.earlierSnapshotId,
      },
    );
  typia.assert(earlierSnapshot);
  const laterSnapshot =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: fixture!.cancellationRequestId,
        snapshotId: fixture!.laterSnapshotId,
      },
    );
  typia.assert(laterSnapshot);
  const earlierSnapshotAgain =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: fixture!.cancellationRequestId,
        snapshotId: fixture!.earlierSnapshotId,
      },
    );
  typia.assert(earlierSnapshotAgain);
  TestValidator.equals(
    "earlier snapshot id preserved across repeated reads",
    earlierSnapshotAgain.id,
    earlierSnapshot.id,
  );
  TestValidator.equals(
    "earlier snapshot reviewer display name preserved across repeated reads",
    earlierSnapshotAgain.reviewer_display_name,
    earlierSnapshot.reviewer_display_name,
  );
  TestValidator.equals(
    "earlier snapshot created_at preserved across repeated reads",
    earlierSnapshotAgain.created_at,
    earlierSnapshot.created_at,
  );
  TestValidator.equals(
    "earlier snapshot fixture reviewer_display_name preserved",
    earlierSnapshot.reviewer_display_name,
    fixture!.expectedEarlierReviewerDisplayName,
  );
  TestValidator.equals(
    "earlier snapshot fixture created_at preserved",
    earlierSnapshot.created_at,
    fixture!.expectedEarlierCreatedAt,
  );
  TestValidator.notEquals(
    "earlier and later snapshot ids differ",
    earlierSnapshot.id,
    laterSnapshot.id,
  );
  TestValidator.predicate(
    "earlier snapshot created before or at later snapshot",
    earlierSnapshot.created_at <= laterSnapshot.created_at,
  );
  TestValidator.equals(
    "earlier snapshot parent cancellation request id matches fixture",
    earlierSnapshot.cancellationRequest.id,
    fixture!.cancellationRequestId,
  );
  TestValidator.equals(
    "later snapshot parent cancellation request id matches fixture",
    laterSnapshot.cancellationRequest.id,
    fixture!.cancellationRequestId,
  );
  TestValidator.equals(
    "parent cancellation request id consistent across snapshots",
    earlierSnapshot.cancellationRequest.id,
    laterSnapshot.cancellationRequest.id,
  );
  TestValidator.equals(
    "parent order item consistent across snapshots",
    earlierSnapshot.cancellationRequest.orderItem.id,
    laterSnapshot.cancellationRequest.orderItem.id,
  );
  TestValidator.equals(
    "parent customer consistent across snapshots",
    earlierSnapshot.cancellationRequest.customer.id,
    laterSnapshot.cancellationRequest.customer.id,
  );
  TestValidator.equals(
    "parent reason consistent across snapshots",
    earlierSnapshot.cancellationRequest.reason,
    laterSnapshot.cancellationRequest.reason,
  );
  TestValidator.equals(
    "parent live status consistent across snapshot reads",
    earlierSnapshot.cancellationRequest.status,
    laterSnapshot.cancellationRequest.status,
  );
  TestValidator.equals(
    "parent createdAt consistent across snapshots",
    earlierSnapshot.cancellationRequest.createdAt,
    laterSnapshot.cancellationRequest.createdAt,
  );
  TestValidator.equals(
    "parent updatedAt consistent across snapshots",
    earlierSnapshot.cancellationRequest.updatedAt,
    laterSnapshot.cancellationRequest.updatedAt,
  );
}
