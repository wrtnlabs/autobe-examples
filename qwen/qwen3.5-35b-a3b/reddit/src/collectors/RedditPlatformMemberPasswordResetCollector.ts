import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformMemberPasswordResetCollector {
  export async function collect(props: {
    body: IRedditPlatformMemberPasswordReset.ICreate;
  }) {
    const member = await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: { email: props.body.email },
    });
    if (!member) {
      return {};
    }
    const id: string = v4();
    return {
      id,
      token: v4(),
      expires_at: new Date(Date.now() + 3600000),
      used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: member.id } },
    } satisfies Prisma.reddit_platform_member_password_resetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformMemberPasswordResetCollector {
//         export async function collect(props: {
//           body: IRedditPlatformMemberPasswordReset.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       token: ...,
//       expires_at: ...,
//       used_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//           } satisfies Prisma.reddit_platform_member_password_resetsCreateInput;
//         }
//       }
//--------------------------------------------------------------