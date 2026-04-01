import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformAdministratorAtSummaryTransformer } from "./MallPlatformAdministratorAtSummaryTransformer";

export namespace MallPlatformAdministratorPasswordResetTransformer {
  export type Payload =
    Prisma.mall_platform_administrator_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: MallPlatformAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_administrator_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformAdministratorPasswordReset> {
    return {
      id: input.id,
      administrator:
        await MallPlatformAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      token: input.token,
      expiredAt: input.expired_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
