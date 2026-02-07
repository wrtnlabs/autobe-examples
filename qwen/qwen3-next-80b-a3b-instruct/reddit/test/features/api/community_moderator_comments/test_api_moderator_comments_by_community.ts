import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comments_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Retrieve comments
  const response = await api.functional.community.moderator.comments.index(
    moderatorConnection,
    {
      body: {} satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure: data must be an array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.equals(
    "pagination exists",
    response.pagination,
    response.pagination,
  );
  TestValidator.predicate(
    "current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", response.pagination.limit > 0);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // 4. Validate all comments are active and have required properties
  for (const comment of response.data) {
    TestValidator.equals("comment status is active", (comment as any).status, "active");
  }
  // 5. Verify pagination consistency
  TestValidator.predicate(
    "correct page count",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
}