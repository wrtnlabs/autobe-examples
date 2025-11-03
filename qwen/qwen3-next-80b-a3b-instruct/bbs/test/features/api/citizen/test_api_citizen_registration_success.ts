import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";

export async function test_api_citizen_registration_success(
  connection: api.IConnection,
) {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  const response: IDiscussionBoardCitizen.IRegisterResponse =
    await api.functional.discussionBoard.auth.citizen.join.create(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(response);
}
