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

export async function test_api_tag_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Setup adminConnection with authentication token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Create test tag
  const createdTag =
    await generate_random_economic_political_discussion_board_admin_tags_create(
      adminConnection,
      {},
    );
  // 3. Delete the tag
  await api.functional.economicPoliticalDiscussionBoard.admin.tags.erase(
    adminConnection,
    { tagId: createdTag.id },
  );
  // 4. Validation: the operation completed successfully
  // The API erase method returns void, so we verify successful operation by absence of error
}
