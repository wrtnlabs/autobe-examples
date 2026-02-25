import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_tag_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful tag update by an authorized administrator.
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
    // First, create a tag via update with a random UUID (simulate) to get a valid tag
    // But as we have no creation endpoint for tags here, use random existing tagId for simulation
    // Use typia to generate a valid tag id
    const existingTagId = typia.random<string & tags.Format<"uuid">>();
    const newName = RandomGenerator.name();
    const body = { name: newName } satisfies IDiscussionBoardTag.IUpdate;
    // Perform actual update
    const result =
      await api.functional.discussionBoard.administrator.tags.update(
        adminConnection,
        {
          tagId: existingTagId,
          body,
        },
      );
    typia.assert(result);
    // Validate updated tag's name matches newName
    TestValidator.equals("updated tag name", result.name, newName);
    TestValidator.predicate(
      "updated tagId is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        result.id,
      ),
    );
  }
  // Scenario 2: Unauthorized update attempt by unauthenticated user.
  {
    const invalidConnection: api.IConnection = { host: connection.host };
    const tagId = typia.random<string & tags.Format<"uuid">>();
    const body = {
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardTag.IUpdate;
    await TestValidator.httpError(
      "unauthorized update attempt",
      401,
      async () => {
        await api.functional.discussionBoard.administrator.tags.update(
          invalidConnection,
          {
            tagId,
            body,
          },
        );
      },
    );
  }
  // Scenario 3: Update attempt with non-existing tagId.
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
    // Use random UUID that is unlikely to exist
    const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
    const body = {
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardTag.IUpdate;
    await TestValidator.httpError(
      "update with non-existing tagId",
      404,
      async () => {
        await api.functional.discussionBoard.administrator.tags.update(
          adminConnection,
          {
            tagId: nonExistentTagId,
            body,
          },
        );
      },
    );
  }
}
