import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformAdministratorPasswordResetCollector {
  export async function collect(props: {
    body: IMallPlatformAdministratorPasswordReset.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const token: string = v4();
    const expiredAt: Date = new Date(now.getTime() + 1000 * 60 * 30);
    return {
      id,
      token,
      expired_at: expiredAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      administrator: {
        connect: { id: props.body.administratorId },
      },
    } satisfies Prisma.mall_platform_administrator_password_resetsCreateInput;
  }
}
