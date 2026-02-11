import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_guest_registration_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  const now = new Date();
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid password (16 chars: 1 uppercase, 1 lowercase, 1 digit, 13 alphanumeric)
  const password =
    RandomGenerator.alphabets(1).toUpperCase() +
    RandomGenerator.alphabets(1) +
    Math.floor(10 * Math.random()).toString() +
    RandomGenerator.alphaNumeric(13);
  const body: ICommunityGuest.IJoin = {
    email: (RandomGenerator.alphabets(5) + "@example.com") satisfies string &
      tags.Format<"email">,
    password,
    username: RandomGenerator.name(1),
  };
  const response: ICommunityGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body },
  );
  typia.assert(response);
  // Validate access token expiration (15 minutes)
  const accessExpiry = new Date(response.token.expired_at);
  const accessMinutes = (accessExpiry.getTime() - now.getTime()) / (60 * 1000);
  TestValidator.predicate(
    "Access token expiration within 14-16 minutes",
    accessMinutes >= 14 && accessMinutes <= 16,
  );
  // Validate refresh token expiration (7 days)
  const refreshExpiry = new Date(response.token.refreshable_until);
  const refreshDays =
    (refreshExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  TestValidator.predicate(
    "Refresh token expiration within 6.9-7.1 days",
    refreshDays >= 6.9 && refreshDays <= 7.1,
  );
}
