import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reports_decision_delete_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests deletion attempt of a report decision by an unauthenticated user or user without moderator privileges.
  // Use a random UUID as the report decision ID to delete
  const randomId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete report decision without authentication
  await TestValidator.httpError(
    "unauthorized deletion should be rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.erase(
        connection,
        { id: randomId },
      );
    },
  );
}
