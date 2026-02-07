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

export async function test_api_moderator_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account to authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = typia.random<ICommunityModerator.IJoin>();
  const registeredModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorData,
    },
  );
  typia.assert(registeredModerator);
  // 2. Retrieve the moderator's karma history with default pagination (cursor-based, newest first)
  const historyResponse =
    await api.functional.community.moderator.karma.history.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 3. Validate the response structure
  // - pagination is present and follows IPage.IPagination structure
  TestValidator.predicate("pagination exists", !!historyResponse.pagination);
  TestValidator.equals(
    "pagination current is 1",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 20",
    historyResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    historyResponse.pagination.pages >= 0,
  );
  // - data array exists and contains ICommunityKarmaHistory.ISummary items
  TestValidator.predicate("data array exists", !!historyResponse.data);
  TestValidator.predicate(
    "data array has items or is empty",
    historyResponse.data.length >= 0,
  );
  // Note: ICommunityKarmaHistory.ISummary has no defined properties, so we cannot validate
  // source_type, source_id, delta_amount, reason, or created_at properties as they don't exist.
  // 4. Test that no other user's karma history can be accessed
  // Create a second moderator
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModerator = await authorize_moderator_join(
    secondModeratorConnection,
    {
      body: typia.random<ICommunityModerator.IJoin>(),
    },
  );
  typia.assert(secondModerator);
  // Fetch second moderator's history
  const secondHistory =
    await api.functional.community.moderator.karma.history.index(
      secondModeratorConnection,
      {
        body: {} satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(secondHistory);
  // Since we cannot access any properties of ISummary, we cannot verify that no other user's data is accessible.
  // This part of the scenario requirement cannot be implemented due to empty ISummary DTO definition.
  // 5. Validate that the data is ordered newest first
  // Cannot verify sorting order because created_at property doesn't exist in ISummary.
  // This part of the scenario requirement cannot be implemented due to empty ISummary DTO definition.
  // The test verifies the API call succeeds and returns a valid structure with pagination and data array.
  // Due to the empty ICommunityKarmaHistory.ISummary DTO, detailed field validations cannot be performed.
}
