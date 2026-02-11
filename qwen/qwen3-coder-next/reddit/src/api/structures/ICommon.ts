export namespace ICommon {
  /**
   * Simple message response for API operations. Contains a human-readable message describing the operation result.
   */
  export type IMessage = {
    /**
     * Human-readable message describing the operation result.
     *
     * @x-autobe-specification Direct mapping for success message responses.
     */
    message: string;
  };
}
