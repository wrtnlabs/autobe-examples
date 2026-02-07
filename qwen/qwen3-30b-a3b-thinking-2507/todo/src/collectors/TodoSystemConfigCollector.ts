import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoSystemConfigCollector {
  export async function collect(props: { body: ITodoSystemConfig.ICreate }) {
    const id = v4();
    return {
      id,
      email_verification_timeout: props.body.email_verification_timeout,
      password_reset_timeout: props.body.password_reset_timeout,
      feature_flags: props.body.feature_flags,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.todo_system_configsCreateInput;
  }
}
