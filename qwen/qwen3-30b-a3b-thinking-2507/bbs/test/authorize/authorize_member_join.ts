import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
export async function authorize_member_join(connection: api.IConnection, props: {
    body: IEconPoliticBoardMember.IJoin;
}): Promise<IEconPoliticBoardMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)
    };
    Bearer;
    $;
    {
        result.token.access;
    }
    `,
    ;
  }
  return result;
};
}