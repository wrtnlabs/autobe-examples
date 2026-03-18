import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoMemberEmailVerificationCollector {
  export async function collect(props: {
    body: IMultiUserTodoMemberEmailVerification.ICreate;
    multiUserTodoMembers: IEntity;
    ip: string;
    href: string;
    referrer: string;
    expired_at: Date;
    email: string;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      token: props.body.token,
      email: props.email,
      ip: props.ip,
      href: props.href,
      referrer: props.referrer,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: props.expired_at,
      member: { connect: { id: props.multiUserTodoMembers.id } },
    } satisfies Prisma.multi_user_todo_member_email_verificationsCreateInput;
  }
}
