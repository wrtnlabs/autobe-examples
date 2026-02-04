import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_token_refresh_for_member(
  connection: api.IConnection,
) {
  const user = await authorize_member_join(connection, {
    body: {} satisfies IEconPoliticBoardMember.IJoin,
  });
  typia.assert(user);
  const refreshedUser = await authorize_member_refresh(connection, {
    body: {
      refresh: user.token.refresh,
    } satisfies IEconPoliticBoardMember.IRefresh,
  });
  typia.assert(refreshedUser);
  const oneHourMs = 60 * 60 * 1000;
  const now = Date.now();
  const expiredAt = new Date(user.token.expired_at).getTime();
  const timeDiff = expiredAt - now;
  TestValidator.predicate("access token should expire within 1 hour", () => {
    return (
      timeDiff > oneHourMs - 5 * 60 * 1000 &&
      timeDiff < oneHourMs + 5 * 60 * 1000
    );
  });
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const refreshableUntil = new Date(user.token.refreshable_until).getTime();
  const timeDiffRefresh = refreshableUntil - now;
  TestValidator.predicate(
    "refresh token should remain valid for 30 days",
    () => {
      return (
        timeDiffRefresh > thirtyDaysMs - 5 * 24 * 60 * 60 * 1000 &&
        timeDiffRefresh < thirtyDaysMs + 5 * 24 * 60 * 60 * 1000
      );
    },
  );
  const refreshedExpiredAt = new Date(refreshedUser.token.expired_at).getTime();
  const timeDiffRefreshed = refreshedExpiredAt - now;
  TestValidator.predicate(
    "refreshed access token should expire within 1 hour",
    () => {
      return (
        timeDiffRefreshed > oneHourMs - 5 * 60 * 1000 &&
        timeDiffRefreshed < oneHourMs + 5 * 60 * 1000
      );
    },
  );
}
