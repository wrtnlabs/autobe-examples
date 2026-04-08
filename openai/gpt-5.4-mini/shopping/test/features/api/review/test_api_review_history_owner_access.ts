import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that review history access returns the preserved review owner view.
 *
 * This test exercises the administrator review history endpoint using a generated review identifier and validates the response shape that carries owner summary and display-state information. The focus is on the immutable read contract exposed by the endpoint rather than unsupported mutation or snapshot details.
 *
 * 1. Creates an isolated administrator connection from the base host.
 * 2. Requests the review history payload for a generated review identifier.
 * 3. Validates the returned review identity, owner summary, and owner display state structure.
 */
export async function test_api_review_history_owner_access(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const history =
    await api.functional.mallPlatform.administrator.reviews.history.at(
      administratorConnection,
      {
        reviewId,
      },
    );
  typia.assert(history);
  TestValidator.equals("review id preserved", history.reviewId, reviewId);
  typia.assert(history.customer);
  TestValidator.predicate(
    "customer summary includes identity and email",
    history.customer.id.length > 0 && history.customer.email.length > 0,
  );
  TestValidator.predicate(
    "display state is supported",
    history.displayState === "activeCustomer" ||
      history.displayState === "deletedUser",
  );
}
