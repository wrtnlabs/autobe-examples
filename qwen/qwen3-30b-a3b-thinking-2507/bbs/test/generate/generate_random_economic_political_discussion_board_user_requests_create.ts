import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdminRequest";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_discussion_board_admin_request } from "../prepare/prepare_random_economic_political_discussion_board_admin_request";

export async function generate_random_economic_political_discussion_board_user_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEconomicPoliticalDiscussionBoardAdminRequest.ICreate>
      | undefined;
  },
): Promise<IEconomicPoliticalDiscussionBoardAdminRequest> {
  const prepared: IEconomicPoliticalDiscussionBoardAdminRequest.ICreate =
    prepare_random_economic_political_discussion_board_admin_request(
      props.body,
    );
  return await api.functional.economicPoliticalDiscussionBoard.user.requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
