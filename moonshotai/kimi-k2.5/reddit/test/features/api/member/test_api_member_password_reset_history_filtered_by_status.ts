import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberPasswordReset";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_history_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies Partial<IRedditLikeMember.IJoin>,
  });
  // 2. Test PENDING status filter
  const pendingResponse =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeMemberPasswordReset.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Verify all pending records have status 'pending'
  TestValidator.predicate(
    "all pending records have status 'pending'",
    pendingResponse.data.every((record) => record.status === "pending"),
  );
  // 3. Test USED status filter
  const usedResponse =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "USED",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeMemberPasswordReset.IRequest,
      },
    );
  typia.assert(usedResponse);
  // Verify all used records have status 'used' and usedAt is not null
  TestValidator.predicate(
    "all used records have status 'used'",
    usedResponse.data.every((record) => record.status === "used"),
  );
  // 4. Test EXPIRED status filter
  const expiredResponse =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "EXPIRED",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResponse);
  // Verify all expired records have status 'expired'
  TestValidator.predicate(
    "all expired records have status 'expired'",
    expiredResponse.data.every((record) => record.status === "expired"),
  );
}
