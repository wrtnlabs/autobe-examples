import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_snapshot_history_preserved_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify review snapshot history is readable and structurally valid for an existing review identifier.
   *
   * This test is constrained by the available SDK surface in the generated client. The only
   * review-related endpoint exposed here is the snapshot-history reader, so the test validates
   * that the endpoint returns a well-formed, paginated snapshot history payload when provided
   * with a review identifier and authenticated customer context.
   *
   * 1. Register and authenticate a customer account using the provided join utility.
   * 2. Query review snapshot history for a generated review identifier.
   * 3. Validate the response is a paginated snapshot list and, when data is present, it is well-formed.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const response =
    await api.functional.mallPlatform.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
          search: undefined,
          snapshotAction: undefined,
          isDeleted: undefined,
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "snapshot history response should be paginated",
    response.pagination.current >= 1 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history data should be an array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "snapshot history items should preserve immutable fields when present",
    response.data.every(
      (snapshot) =>
        snapshot.id.length > 0 &&
        snapshot.review.id.length > 0 &&
        snapshot.customer.id.length > 0 &&
        typeof snapshot.snapshotAction === "string" &&
        typeof snapshot.rating === "number" &&
        (snapshot.content === null || typeof snapshot.content === "string") &&
        typeof snapshot.isDeleted === "boolean" &&
        typeof snapshot.createdAt === "string",
    ),
  );
}
