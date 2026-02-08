import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sections_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized users (unauthenticated or non-administrators) cannot delete discussion board sections.
  // 1. Attempt to delete a section without authentication:
  const unauthConnection: api.IConnection = { host: connection.host };
  const randomSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthenticated user cannot delete section",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.sections.erase(
        unauthConnection,
        {
          sectionId: randomSectionId,
        },
      );
    },
  );
  // 2. Create and authenticate a regular user (non-administrator) and attempt to delete the section:
  // Note: The scenario and given data only provide administrator join authorization functions and no direct utility function for user login,
  // so we can only test unauthenticated access as per input material constraints.
  // Since the scenario only specifies the administrator join dependency and no user or other actor is defined, we skip this step.
  // Therefore only unauthenticated case is in practice possible here.
}
