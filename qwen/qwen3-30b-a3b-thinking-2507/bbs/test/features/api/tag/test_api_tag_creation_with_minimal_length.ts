import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_discussion_board_admin_tags_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_tags_create";
import { prepare_random_economic_political_discussion_board_tag } from "../../../prepare/prepare_random_economic_political_discussion_board_tag";

export async function test_api_tag_creation_with_minimal_length(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}.com`,
      href: "https://example.com",
      referrer: "http://example.com",
    },
  });
  const tag: IEconomicPoliticalDiscussionBoardTag =
    await generate_random_economic_political_discussion_board_admin_tags_create(
      adminConnection,
      {
        body: {
          name: "ab",
        },
      },
    );
  typia.assert(tag);
  TestValidator.equals("tag name matches input", tag.name, "ab");
}
