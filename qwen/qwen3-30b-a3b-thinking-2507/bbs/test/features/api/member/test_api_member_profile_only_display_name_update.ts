import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_only_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEconPoliticBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {},
    });
  typia.assert(member);
  const newDisplayName = "Updated Display Name";
  const updatedProfile: IEconPoliticBoardProfile =
    await api.functional.econPoliticBoard.member.profiles.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IEconPoliticBoardProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
}
