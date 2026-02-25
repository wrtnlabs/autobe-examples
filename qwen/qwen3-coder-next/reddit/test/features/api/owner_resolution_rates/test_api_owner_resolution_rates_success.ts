import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_resolution_rates_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials: IRedditCloneOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    displayName: `Owner ${RandomGenerator.name()}`,
  };
  await authorize_owner_join(ownerConnection, { body: ownerCredentials });
  const resolutionRates =
    await api.functional.redditClone.owner.analytics.resolution_rates.resolutionRates(
      ownerConnection,
    );
  typia.assert<IRedditCloneContentPost.IResolutionRate>(resolutionRates);
  TestValidator.predicate(
    "total reports is positive",
    resolutionRates.totalReports > 0,
  );
  TestValidator.predicate(
    "resolved reports is non-negative",
    resolutionRates.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "pending reports is non-negative",
    resolutionRates.pendingReports >= 0,
  );
  TestValidator.predicate(
    "approval rate is 0-100",
    resolutionRates.approvalRate >= 0 && resolutionRates.approvalRate <= 100,
  );
  TestValidator.predicate(
    "dismissal rate is 0-100",
    resolutionRates.dismissalRate >= 0 && resolutionRates.dismissalRate <= 100,
  );
  TestValidator.predicate(
    "average resolution time is non-negative",
    resolutionRates.averageResolutionTimeMinutes >= 0,
  );
  TestValidator.predicate(
    "calculatedAt is valid date-time",
    new Date(resolutionRates.calculatedAt).toISOString() ===
      resolutionRates.calculatedAt,
  );
  if (resolutionRates.resolutionHistory) {
    TestValidator.predicate(
      "resolution history is not empty",
      resolutionRates.resolutionHistory.length > 0,
    );
    resolutionRates.resolutionHistory.forEach((history, index) => {
      TestValidator.equals(
        `history[${index}] date format`,
        typeof history.date,
        "string",
      );
      TestValidator.predicate(
        `history[${index}] received is positive`,
        history.received > 0,
      );
      TestValidator.predicate(
        `history[${index}] approved is non-negative`,
        history.approved >= 0,
      );
      TestValidator.predicate(
        `history[${index}] dismissed is non-negative`,
        history.dismissed >= 0,
      );
    });
  }
}
