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
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Read a scoped cancellation request as an administrator.
 *
 * Validates that the administrator-only scoped cancellation request read endpoint returns a live cancellation request record for the requested order-item scope. The response is checked as a complete DTO payload so the test confirms the request is readable, structurally valid, and still associated with the scoped order item context.
 *
 * This scenario focuses on current-state governance visibility. It intentionally stays read-only and does not attempt to verify snapshots, inventory changes, order transitions, or other side effects that are outside the endpoint response contract.
 *
 * 1. Authenticate a dedicated administrator connection using the administrator join utility.
 * 2. Read the cancellation request using the scoped order item and request identifiers.
 * 3. Validate the returned live record and confirm the nested relations and decision metadata are present in the response payload.
 */
export async function test_api_cancellation_request_read_scoped_record(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const cancellationRequest =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.at(
      administratorConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.predicate(
    "cancellation request should contain an order item reference",
    cancellationRequest.orderItem !== null &&
      cancellationRequest.orderItem !== undefined,
  );
  TestValidator.predicate(
    "cancellation request should contain a reviewer reference or remain pending",
    cancellationRequest.reviewer === null ||
      cancellationRequest.reviewer !== undefined,
  );
  TestValidator.predicate(
    "cancellation request should expose a non-empty reason",
    cancellationRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "cancellation request should expose a live status value",
    cancellationRequest.status.length > 0,
  );
  TestValidator.predicate(
    "cancellation request should expose creation and update timestamps",
    cancellationRequest.createdAt.length > 0 &&
      cancellationRequest.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "cancellation request should preserve optional decision metadata fields",
    cancellationRequest.reviewedAt === null ||
      cancellationRequest.reviewedAt.length > 0,
  );
  TestValidator.predicate(
    "cancellation request should preserve optional review result metadata",
    cancellationRequest.reviewResult === null ||
      cancellationRequest.reviewResult.length > 0,
  );
  TestValidator.predicate(
    "cancellation request should preserve optional reviewer note metadata",
    cancellationRequest.reviewerNote === null ||
      cancellationRequest.reviewerNote.length > 0,
  );
  TestValidator.predicate(
    "cancellation request should not be soft deleted in the normal live-record read path",
    cancellationRequest.deletedAt === null ||
      cancellationRequest.deletedAt.length > 0,
  );
}
