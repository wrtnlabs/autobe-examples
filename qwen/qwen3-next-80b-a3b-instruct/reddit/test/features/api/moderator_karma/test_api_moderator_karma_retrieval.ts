import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_karma_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Retrieve moderator karma score and history
  const karmaData =
    await api.functional.community.moderator.karma.at(moderatorConnection);
  typia.assert(karmaData);
  // 3. Validate karma score structure
  // Note: ICommunityKarmaScore is empty in DTO - but we validate structure
  // The API contract requires this to be returned, so we verify it's there
  TestValidator.predicate("karma response is object", karmaData !== null);
}
