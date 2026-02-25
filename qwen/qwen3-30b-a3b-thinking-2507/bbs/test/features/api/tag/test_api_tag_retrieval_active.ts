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

export async function test_api_tag_retrieval_active(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // 2. Create tag
  const tag =
    await generate_random_economic_political_discussion_board_admin_tags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(tag);
  // 3. Retrieve created tag
  const retrievedTag =
    await api.functional.economicPoliticalDiscussionBoard.tags.at(
      adminConnection,
      {
        tagId: tag.id,
      },
    );
  typia.assert(retrievedTag);
  // 4. Validate tag metadata
  TestValidator.equals("Tag name matches", retrievedTag.name, tag.name);
  TestValidator.equals("Tag ID matches", retrievedTag.id, tag.id);
  TestValidator.predicate("Creation timestamp is UTC ISO", () => {
    const match = retrievedTag.created_at.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/,
    );
    return match !== null;
  });
  TestValidator.predicate("Update timestamp is UTC ISO", () => {
    const match = retrievedTag.updated_at.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/,
    );
    return match !== null;
  });
  TestValidator.equals(
    "Tag is active (deleted_at null)",
    retrievedTag.deleted_at,
    null,
  );
}
