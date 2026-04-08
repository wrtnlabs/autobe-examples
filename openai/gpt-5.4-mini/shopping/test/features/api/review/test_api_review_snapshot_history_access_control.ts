import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify review snapshot history access control for administrator-only browsing.
 *
 * This test validates that review snapshot history can be retrieved by an
 * authenticated administrator and that an unrelated unauthenticated session is
 * denied access to the same preserved audit data. It focuses on the protected
 * history-browsing path used for dispute resolution and ensures that immutable
 * review snapshots are not exposed to unauthorized callers.
 *
 * 1. Authenticate a dedicated administrator connection.
 * 2. Request review snapshot history successfully for a review identifier.
 * 3. Validate the paginated snapshot response structure.
 * 4. Retry the same request from an unauthorized connection.
 * 5. Confirm the unauthorized request is rejected.
 */
export async function test_api_review_snapshot_history_access_control(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const authorizedHistory =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(authorizedHistory);
  TestValidator.predicate(
    "administrator snapshot history is paginated",
    authorizedHistory.pagination.records >= 0 &&
      authorizedHistory.pagination.pages >= 0 &&
      authorizedHistory.pagination.current >= 0 &&
      authorizedHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "administrator snapshot history data is an array",
    Array.isArray(authorizedHistory.data),
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized session cannot access review snapshot history",
    async () => {
      await api.functional.mallPlatform.administrator.reviews.snapshots.index(
        unauthorizedConnection,
        {
          reviewId,
          body: {
            page: 1,
            limit: 10,
            sort: "-createdAt",
          } satisfies IMallPlatformReviewSnapshot.IRequest,
        },
      );
    },
  );
}
