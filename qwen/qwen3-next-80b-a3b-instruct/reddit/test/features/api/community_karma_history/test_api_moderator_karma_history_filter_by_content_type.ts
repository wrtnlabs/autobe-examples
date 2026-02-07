import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_karma_history_filter_by_content_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate moderator with authorize_moderator_join utility
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Call the endpoint with an empty request body (ICommunityKarmaHistory.IRequest is empty {})
  const request: ICommunityKarmaHistory.IRequest = {};
  const result = await api.functional.community.moderator.karma.history.index(
    moderatorConnection,
    { body: request },
  );
  typia.assert(result);
  // 3. Validate the response structure contains required properties from IPageICommunityKarmaHistory.ISummary
  // The interface defines: pagination (IPage.IPagination) and data (ICommunityKarmaHistory.ISummary[])
  TestValidator.predicate(
    "response contains pagination property",
    () => result.pagination !== undefined,
  );
  TestValidator.predicate(
    "response contains data property",
    () => result.data !== undefined,
  );
  // Validate pagination structure exists and has correct properties
  TestValidator.predicate(
    "pagination has current property",
    () => result.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit property",
    () => result.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records property",
    () => result.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages property",
    () => result.pagination.pages !== undefined,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", () =>
    Array.isArray(result.data),
  );
  // Validate the data array has correct item type
  // Since ICommunityKarmaHistory.ISummary is empty, we can't validate properties
  // We can only verify it's an array of objects
  for (const item of result.data) {
    TestValidator.predicate(
      "data item is an object",
      () => item !== null && typeof item === "object",
    );
  }
}
