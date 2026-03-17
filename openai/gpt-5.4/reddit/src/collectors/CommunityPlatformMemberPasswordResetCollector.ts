import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformMemberPasswordResetCollector {
  export async function collect(props: {
    body: ICommunityPlatformMemberPasswordReset.ICreate;
    ip: string;
  }) {
    const member =
      await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
        where: {
          email: props.body.email,
        },
      });
    const now: Date = new Date();
    const token: string = Array.from({ length: 64 }, () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return chars[Math.floor(Math.random() * chars.length)];
    }).join("");
    return {
      id: v4(),
      token,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: new Date(now.getTime() + 1000 * 60 * 60),
      used_at: null,
      revoked_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: {
          id: member.id,
        },
      },
    } satisfies Prisma.community_platform_member_password_resetsCreateInput;
  }
}
