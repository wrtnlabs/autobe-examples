import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member join operation
  const memberConnection: api.IConnection = { host: connection.host };
  // Use utility function for member join as it is available
  const result = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  // Validate response type with typia.assert - this validates ALL structure including format<"date-time"> for tokens
  typia.assert(result);
}
