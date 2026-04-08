import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IErpHrmTimeGuestSession.IJoin;
  },
): Promise<IErpHrmTimeGuestSession.IAuthorized> {
  return await api.functional.erpHrmTime.auth.guest.join(connection, {
    body: props.body,
  });
}
