import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminMfaVerify(props: {
  admin: AdminPayload;
  body: IEconDiscussAdmin.IMfaVerifyRequest;
}): Promise<IEconDiscussAdmin.ISecurityEvent> {
  const { admin, body } = props;

  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: admin.id, deleted_at: null },
    select: {
      id: true,
      mfa_secret: true,
      mfa_enabled: true,
      mfa_recovery_codes: true,
    },
  });
  if (user === null) throw new HttpException("Not Found", 404);
  if (user.mfa_enabled === true)
    throw new HttpException("Conflict: MFA already enabled", 409);
  if (!user.mfa_secret)
    throw new HttpException("Conflict: MFA setup required", 409);

  // Extract inputs (IMfaVerifyRequest is any)
  const code =
    body && (body as any).code !== undefined && (body as any).code !== null
      ? String((body as any).code)
      : undefined;
  const recoveryCode =
    body &&
    (body as any).recovery_code !== undefined &&
    (body as any).recovery_code !== null
      ? String((body as any).recovery_code)
      : undefined;
  const providedCount = (code ? 1 : 0) + (recoveryCode ? 1 : 0);
  if (providedCount !== 1)
    throw new HttpException(
      "Bad Request: Provide exactly one of 'code' or 'recovery_code'",
      400,
    );

  // Base32 decode (RFC 4648)
  const base32Decode = (b32: string): Uint8Array => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = b32.replace(/=+$/g, "").toUpperCase();
    let bits = "";
    for (let i = 0; i < clean.length; i++) {
      const val = alphabet.indexOf(clean[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, "0");
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8)
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    return new Uint8Array(bytes);
  };

  // SHA-1
  const sha1 = (message: Uint8Array): Uint8Array => {
    const ml = message.length * 8;
    const withOne = new Uint8Array(message.length + 1);
    withOne.set(message);
    withOne[message.length] = 0x80;

    const mod64 = withOne.length % 64;
    const zeroPadLen = mod64 <= 56 ? 56 - mod64 : 56 + (64 - mod64);
    const padded = new Uint8Array(withOne.length + zeroPadLen + 8);
    padded.set(withOne);

    const view = new DataView(padded.buffer);
    const hi = Math.floor(ml / 0x100000000);
    const lo = ml >>> 0;
    view.setUint32(padded.length - 8, hi);
    view.setUint32(padded.length - 4, lo);

    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;

    const w = new Int32Array(80);
    for (let i = 0; i < padded.length; i += 64) {
      for (let j = 0; j < 16; j++) {
        const idx = i + j * 4;
        w[j] =
          (padded[idx] << 24) |
          (padded[idx + 1] << 16) |
          (padded[idx + 2] << 8) |
          (padded[idx + 3] << 0);
      }
      for (let j = 16; j < 80; j++) {
        const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
        w[j] = ((x << 1) | (x >>> 31)) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;

      for (let j = 0; j < 80; j++) {
        let f = 0;
        let k = 0;
        if (j < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }
        const temp = (((a << 5) | (a >>> 27)) + f + e + k + (w[j] >>> 0)) >>> 0;
        e = d;
        d = c;
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = temp;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }

    const out = new Uint8Array(20);
    out[0] = (h0 >>> 24) & 0xff;
    out[1] = (h0 >>> 16) & 0xff;
    out[2] = (h0 >>> 8) & 0xff;
    out[3] = h0 & 0xff;
    out[4] = (h1 >>> 24) & 0xff;
    out[5] = (h1 >>> 16) & 0xff;
    out[6] = (h1 >>> 8) & 0xff;
    out[7] = h1 & 0xff;
    out[8] = (h2 >>> 24) & 0xff;
    out[9] = (h2 >>> 16) & 0xff;
    out[10] = (h2 >>> 8) & 0xff;
    out[11] = h2 & 0xff;
    out[12] = (h3 >>> 24) & 0xff;
    out[13] = (h3 >>> 16) & 0xff;
    out[14] = (h3 >>> 8) & 0xff;
    out[15] = h3 & 0xff;
    out[16] = (h4 >>> 24) & 0xff;
    out[17] = (h4 >>> 16) & 0xff;
    out[18] = (h4 >>> 8) & 0xff;
    out[19] = h4 & 0xff;
    return out;
  };

  const hmacSha1 = (key: Uint8Array, data: Uint8Array): Uint8Array => {
    const blockSize = 64;
    let k = key;
    if (k.length > blockSize) k = sha1(k);
    if (k.length < blockSize) {
      const tmp = new Uint8Array(blockSize);
      tmp.set(k);
      k = tmp;
    }
    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      oKeyPad[i] = k[i] ^ 0x5c;
      iKeyPad[i] = k[i] ^ 0x36;
    }
    const inner = new Uint8Array(iKeyPad.length + data.length);
    inner.set(iKeyPad);
    inner.set(data, iKeyPad.length);
    const innerHash = sha1(inner);
    const outer = new Uint8Array(oKeyPad.length + innerHash.length);
    outer.set(oKeyPad);
    outer.set(innerHash, oKeyPad.length);
    return sha1(outer);
  };

  const hotp = (
    secret: Uint8Array,
    counter: number,
    digits: number,
  ): string => {
    const buf = new Uint8Array(8);
    const dv = new DataView(buf.buffer);
    const high = Math.floor(counter / 0x100000000);
    const low = counter >>> 0;
    dv.setUint32(0, high);
    dv.setUint32(4, low);

    const mac = hmacSha1(secret, buf);
    const offset = mac[mac.length - 1] & 0x0f;
    const bin =
      ((mac[offset] & 0x7f) << 24) |
      ((mac[offset + 1] & 0xff) << 16) |
      ((mac[offset + 2] & 0xff) << 8) |
      (mac[offset + 3] & 0xff);
    const mod = 10 ** digits;
    const code = bin % mod;
    return String(code).padStart(digits, "0");
  };

  const verifyTotp = (
    b32Secret: string,
    input: string,
    digits: number,
    periodSeconds: number,
  ): boolean => {
    const secret = base32Decode(b32Secret);
    const nowSec = Math.floor(Date.now() / 1000);
    const counter = Math.floor(nowSec / periodSeconds);
    for (let w = -1; w <= 1; w++) {
      const token = hotp(secret, counter + w, digits);
      if (token === input) return true;
    }
    return false;
  };

  if (code) {
    const digits =
      body &&
      (body as any).digits !== undefined &&
      (body as any).digits !== null
        ? Number((body as any).digits)
        : 6;
    const period =
      body &&
      (body as any).period !== undefined &&
      (body as any).period !== null
        ? Number((body as any).period)
        : 30;

    const ok = verifyTotp(user.mfa_secret, code, digits, period);
    if (!ok) throw new HttpException("Invalid verification code", 400);
  } else if (recoveryCode) {
    const stored = user.mfa_recovery_codes ?? "";
    let matched = false;
    if (stored) {
      matched = stored.includes(recoveryCode);
      if (!matched) {
        try {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr))
            matched = arr.some((x) => String(x) === recoveryCode);
        } catch {}
      }
      if (!matched) {
        try {
          matched = await PasswordUtil.verify(recoveryCode, stored);
        } catch {
          matched = false;
        }
      }
    }
    if (!matched) throw new HttpException("Invalid verification code", 400);
  }

  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newRecoveryCodes =
    body &&
    (body as any).recovery_codes !== undefined &&
    (body as any).recovery_codes !== null
      ? String((body as any).recovery_codes)
      : undefined;

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: admin.id },
    data: {
      mfa_enabled: true,
      updated_at: nowIso,
      mfa_recovery_codes: newRecoveryCodes ?? undefined,
    },
  });

  return { outcome: "verified", occurred_at: nowIso };
}
